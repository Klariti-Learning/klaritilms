"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { MegaphoneIcon, Sparkles, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ApiError } from '@/types';
import { Button } from './ui/button';
import Loader from './Loader';
// import moment from 'moment-timezone';

interface Announcement {
    _id: string;
    name: string;
    date: string;
    timing: string;
    announcement: string;
    updatedAt: string;
    teacherId: {
        _id: string;
        name: string;
    };
    attachment?: {
        type: string;
        url: string;
        fileId: string;
        name: string;
    };
}


export default function Announcements() {
    const { user, loading: authLoading, deviceId } = useAuth();
    const router = useRouter();
    const [announcementEvents, setAnnouncementEvents] = useState<Announcement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [announcementLoading, setAnnouncementLoading] = useState<boolean>(false);

    const handleUnauthorized = useCallback(() => {
        console.debug("[StudentDashboard] Handling unauthorized access");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("isLoggedIn");
        router.push("/login");
    }, [router]);


    const formatDateTime = (date: string) => {
        const callDate = new Date(date);
        return callDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

const fetchAnnouncements = useCallback(async () => {
    if (!user || !deviceId) return;
    try {
        setAnnouncementLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        if (!token) {
            handleUnauthorized();
            return;
        }

        const response = await api.get("/announcements", {
            headers: {
                Authorization: `Bearer ${token}`,
                "Device-Id": deviceId,
            },
        });

        console.log("[fetchAnnouncements] API Response:", response.data?.announcements);

        const announcementData: Announcement[] = response.data?.announcements || [];
        const announcements = announcementData
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 3);

        console.log("[fetchAnnouncements] Latest Three Announcements:", announcements);
        setAnnouncementEvents(announcements);
    } catch (error) {
        const apiError = error as ApiError;
        console.error("[StudentDashboard] Failed to fetch announcements:", apiError);
        const errorMessage =
            apiError.response?.data?.message || "Failed to fetch announcements";
        setError(errorMessage);
        if (apiError.response?.status === 401) {
            handleUnauthorized();
        } else {
            toast.error(errorMessage);
        }
    } finally {
        setAnnouncementLoading(false);
    }
}, [user, deviceId, handleUnauthorized]);

    useEffect(() => {
        console.log(authLoading , user?.role.roleName , user)
        if (!authLoading && user && user.role?.roleName === "Student") {
            console.debug("[StudentDashboard] Fetching data", { userId: user._id });
            fetchAnnouncements();
        }
    }, [authLoading, user, fetchAnnouncements]);

    console.log(announcementEvents)
    if (authLoading || (!user && announcementLoading)) {
        return (
            <div className="text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Loader
                        height="80"
                        width="80"
                        color="#2563eb"
                        ariaLabel="triangle-loading"
                        wrapperStyle={{}}
                        wrapperClass=""
                        visible={true}
                    />
                    <p className="mt-6 text-blue-700 font-medium text-lg">
                        Loading your dashboard...
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-blue-600 text-sm">
                            Preparing your learning space
                        </span>
                        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user || user.role?.roleName !== "Student") {
        return null;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="p-4 bg-red-50 rounded-xl shadow-lg">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Error Loading Dashboard
                        </h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button
                            onClick={() => {
                                setError(null);
                                fetchAnnouncements();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <Card className='bg-white/80 border-0 backdrop-blur-sm  transition-all h-fit lg:h-full '>
            <CardHeader>
                <CardTitle className='flex gap-4'>
                    <div className='p-3 bg-blue-700 rounded-lg flex items-center justify-center'>
                        <MegaphoneIcon className='h-6 w-6 text-white -rotate-45' />
                    </div>
                    <span>
                        <p className='text-xl font-bold text-blue-700'>Announcements</p>
                        <p className='text-sm text-gray-600'>A new announcement is available now.</p>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
              
                {announcementEvents?.map((announcement, idx) => {
                    const calculatedDate = formatDateTime(announcement.date)
                    const createdAt = new Date(announcement.updatedAt);
                    const now = new Date(); // the current time in milliseconds 
 
                    const diffMs = now.getTime() - createdAt.getTime();
                    const diffSeconds = Math.floor(diffMs / 1000);
                    const diffMinutes = Math.floor(diffSeconds / 60);
                    const diffHours = Math.floor(diffMinutes / 60);
                    const diffDays = Math.floor(diffHours / 24);

                    let timeAgo = "";

                    if (diffDays > 0) {
                            timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                        } else if (diffHours > 0) {
                            timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                        } else if (diffMinutes > 0) {
                            timeAgo = `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
                        } else {
                            timeAgo = `${diffSeconds} ${diffSeconds === 1 ? 'second' : 'seconds'} ago`;
                        }

                    return (
                        <Card key={announcement._id + "#" + idx} className='mb-4 hover:shadow-2xl hover:bg-gray-50 cursor-pointer transition-all border-1 border-gray-200 shadow-lg'>
                            <CardContent className='space-y-2'>
                                <div className='flex justify-between'>
                                    <p className='text-sm font-semibold text-gray-600'>{calculatedDate}</p>
                                    <p className='text-sm font-semibold text-black'>{timeAgo}</p>
                                </div>
                                <div className='text-base text-violet-800 font-semibold'>
                                    {announcement?.name}
                                </div>
                                <div className='text-base text-gray-600'>
                                    {announcement?.announcement}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </CardContent>
        </Card>
    )
}
